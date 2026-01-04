/**
 * Locations New Location Modal Component
 *
 * Modal for creating a new location.
 *
 * @module components/locations/LocationsNewLocationModal
 */
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';

import axios from 'axios';

import LocationsLocationPickerMap from '../LocationsLocationPickerMap';
import { SelectedLocation } from '@/lib/types/maps';
import type { NewLocationModalProps } from '@/lib/types/components';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { Licensee } from '@/lib/types/licensee';

import { fetchCountries } from '@/lib/helpers/countries';
import type { Country } from '@/lib/types/country';

export default function LocationsNewLocationModal({
  isOpen,
  onClose,
  onCreated,
}: NewLocationModalProps) {
  const { user } = useUserStore();

  // Remove the store dependency since we'll call API directly

  // Form state - all fields blank by default
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
  });
  const [useMap, setUseMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const isDeveloper = Array.isArray(user?.roles)
    ? user.roles.includes('developer')
    : false;

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
        value: timeStr,
        label: `Prev. day, ${timeStr}`,
        hour: hour,
        minute: 0,
      });
    }

    // Add midnight
    options.push({
      value: '00:00',
      label: 'Midnight, 00:00',
      hour: 0,
      minute: 0,
    });

    // Add current day options (01:00 to 23:00) - hourly only
    for (let hour = 1; hour <= 23; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      options.push({
        value: timeStr,
        label: `Curr. day, ${timeStr}`,
        hour: hour,
        minute: 0,
      });
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  // Load licensees and countries on modal open
  useEffect(() => {
    if (isOpen) {
      loadLicensees();
      loadCountries();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        street: '',
        city: '',
        country: '',
        profitShare: '',
        licencee: '',
        isLocalServer: false,
        latitude: '',
        longitude: '',

        dayStartTime: '08:00',

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
      setUseMap(false);
    }
  }, [isOpen]);

  const loadLicensees = async () => {
    setLicenseesLoading(true);
    try {
      const result = await fetchLicensees();
      const licenseesData = Array.isArray(result.licensees) ? result.licensees : [];
      setLicensees(licenseesData);
    } catch (error) {
      console.error('Failed to fetch licensees:', error);
      toast.error('Failed to load licensees');
    } finally {
      setLicenseesLoading(false);
    }
  };

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
    setFormData(prev => ({
      ...prev,
      billValidatorOptions: {
        ...prev.billValidatorOptions,
        [denom]: checked,
      },
    }));
  };

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
      // Update address, city and country if they were provided by the map
      ...(location.address && { street: location.address }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.licencee) {
        throw new Error('Please fill in all required fields');
      }

      // Convert dayStartTime (HH:MM) to gameDayOffset (number of hours)
      const gameDayOffset = parseInt(formData.dayStartTime.split(':')[0]);

      // Create location object matching the expected interface
      const locationData = {
        name: formData.name,

        address: {
          street: formData.street,
          city: formData.city,
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare) || 50,
        rel: {
          licencee: formData.licencee,
        },
        isLocalServer: formData.isLocalServer,
        geoCoords: {
          latitude: parseFloat(formData.latitude) || 0,
          longitude: parseFloat(formData.longitude) || 0,
        },
        gameDayOffset: gameDayOffset,
        billValidatorOptions: formData.billValidatorOptions,
      };

      // Debug: Log the data being sent
      // console.log(
      //   "Sending location data:",
      //   JSON.stringify(locationData, null, 2)
      // );

      // Add location by calling API directly
      const response = await axios.post('/api/locations', locationData);
      console.warn('Location created successfully:', response.data);

      // Show success message
      toast.success('Location added successfully');

      // Close modal and refresh
      console.warn('Calling onCreated callback...');
      onCreated?.();
      onClose();
    } catch (error) {
      console.error('Error adding location:', error);

      // Enhanced error handling for axios errors
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        const statusCode = error.response?.status;
        console.error(`API Error (${statusCode}):`, errorMessage);
        console.error('Response data:', error.response?.data);
        toast.error(`Failed to add location: ${errorMessage}`);
      } else {
        toast.error(
          error instanceof Error ? error.message : 'Failed to add location'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mx-2 max-h-[95vh] w-full max-w-lg overflow-hidden bg-white p-0 sm:mx-4 sm:max-w-xl md:mx-0 md:max-h-[90vh] md:max-w-2xl lg:max-w-4xl">
        <DialogHeader className="border-b border-gray-200 p-4 md:p-6">
          <DialogTitle className="text-xl font-bold text-gray-800 md:text-2xl">
            Add New Location
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(95vh-120px)] space-y-4 overflow-y-auto p-4 md:max-h-[calc(90vh-120px)] md:space-y-6 md:p-6"
        >
          {/* Location Name */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-grayHighlight">
              Location Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter location name"
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
            <div>
              <label className="mb-2 block text-sm font-medium text-grayHighlight">
                Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={e => handleSelectChange('country', e.target.value)}
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
            <div>
              <label className="mb-2 block text-sm font-medium text-grayHighlight">
                Profit Share (%)
              </label>
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
                placeholder="50"
                className="h-12 w-full border-border bg-container text-base"
              />
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
              onChange={e => handleSelectChange('licencee', e.target.value)}
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
              value={formData.dayStartTime}
              onChange={e => handleSelectChange('dayStartTime', e.target.value)}
              className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
            >
              {timeOptions.map((option, index) => (
                <option key={`${option.value}-${index}`} value={option.value}>
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
                <Label htmlFor="useMap" className="flex-1 text-sm font-medium">
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
                <div className="flex flex-1 items-center rounded-r-md border border-l-0 border-border bg-container">
                  <Input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="h-12 w-full border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly={useMap}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <div className="min-w-[80px] rounded-l-md bg-button px-4 py-3 text-primary-foreground">
                  <span className="text-sm font-medium">Longitude</span>
                </div>
                <div className="flex flex-1 items-center rounded-r-md border border-l-0 border-border bg-container">
                  <Input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="h-12 w-full border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly={useMap}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Map Component with Integrated Search */}
          {useMap && (
            <div className="mt-4">
              {/* Map Load Error Indicator */}
              {mapLoadError && (
                <div className="relative z-10 mb-2 rounded-md border border-yellow-200 bg-yellow-50 p-2">
                  <p className="text-xs text-yellow-700">
                    ?? Map hasn&apos;t loaded properly. Please uncheck and check
                    the &quot;Use Map&quot; button again. ?? Map hasn&apos;t
                    loaded properly. Please uncheck and check the &quot;Use
                    Map&quot; button again.
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

          {/* Bill Validator Denominations */}
          <div className="mb-4">
            <div className="mb-3 flex justify-center">
              <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                <Checkbox
                  id="billValidatorOptionsAll"
                  checked={Object.values(formData.billValidatorOptions).every(
                    checked => checked
                  )}
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
                  htmlFor="billValidatorOptionsAll"
                  className="text-sm font-medium"
                >
                  Bill Validator Denominations (Check All)
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[
                { key: 'denom1', label: '$1' },
                { key: 'denom2', label: '$2' },
                { key: 'denom5', label: '$5' },
                { key: 'denom10', label: '$10' },
                { key: 'denom20', label: '$20' },
                { key: 'denom50', label: '$50' },
                { key: 'denom100', label: '$100' },
                { key: 'denom200', label: '$200' },
                { key: 'denom500', label: '$500' },
                { key: 'denom1000', label: '$1,000' },
                { key: 'denom2000', label: '$2,000' },
                { key: 'denom5000', label: '$5,000' },
                { key: 'denom10000', label: '$10,000' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center space-x-2 rounded-lg bg-gray-50 p-2"
                >
                  <Checkbox
                    id={key}
                    checked={
                      formData.billValidatorOptions[
                        key as keyof typeof formData.billValidatorOptions
                      ] as boolean
                    }
                    onCheckedChange={checked =>
                      handleBillValidatorChange(key, checked === true)
                    }
                    className="h-5 w-5 border-buttonActive text-grayHighlight focus:ring-buttonActive"
                  />
                  <Label htmlFor={key} className="flex-1 text-sm font-medium">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 w-full px-6 py-3 text-base sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full bg-buttonActive px-6 py-3 text-base text-white hover:bg-buttonActive/90 sm:w-auto"
            >
              {isLoading ? 'Adding...' : 'Add Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
