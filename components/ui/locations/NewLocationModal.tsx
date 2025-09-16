"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import axios from "axios";

import { useLocationStore } from "@/lib/store/locationStore";
import LocationPickerMap from "./LocationPickerMap";
import { SelectedLocation } from "@/lib/types/maps";
import type { NewLocationModalProps } from "@/lib/types/components";
import { fetchLicensees } from "@/lib/helpers/licensees";
import type { Licensee } from "@/lib/types/licensee";

import { fetchCountries } from "@/lib/helpers/countries";
import type { Country } from "@/lib/helpers/countries";


export default function NewLocationModal({
  isOpen,
  onClose,
  onCreated,
}: NewLocationModalProps) {

  // Remove the store dependency since we'll call API directly

  const { createLocation } = useLocationStore();

  // Form state - all fields blank by default
  const [formData, setFormData] = useState({
    name: "",
    street: "",
    city: "",
    country: "",
    profitShare: "",
    licencee: "",
    isLocalServer: false,
    latitude: "",
    longitude: "",

    dayStartTime: "08:00", // Default to 8:00 AM

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

  // Generate time options for day start time dropdown
  const generateTimeOptions = () => {
    const options = [];

    // Add previous day options (18:00 to 23:59)
    for (let hour = 18; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // 15-minute intervals
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push({
          value: timeStr,
          label: `Prev. day, ${timeStr}`,
          hour: hour,
          minute: minute,
        });
      }
    }

    // Add midnight
    options.push({
      value: "00:00",
      label: "Midnight, 00:00",
      hour: 0,
      minute: 0,
    });

    // Add current day options (00:15 to 17:45)
    for (let hour = 0; hour <= 17; hour++) {
      for (let minute = hour === 0 ? 15 : 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push({
          value: timeStr,
          label: `Curr. day, ${timeStr}`,
          hour: hour,
          minute: minute,
        });
      }
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  // Load licensees and countries on modal open
  useEffect(() => {
    if (isOpen) {
      loadLicensees();
      loadCountries();

  const [mapLoadError, setMapLoadError] = useState(false);

  // Load licensees on modal open
  useEffect(() => {
    if (isOpen) {
      loadLicensees();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        street: "",
        city: "",
        country: "",
        profitShare: "",
        licencee: "",
        isLocalServer: false,
        latitude: "",
        longitude: "",

        dayStartTime: "08:00",

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
      const licenseesData = await fetchLicensees();
      setLicensees(licenseesData);
    } catch (error) {
      console.error("Failed to fetch licensees:", error);
      toast.error("Failed to load licensees");
    } finally {
      setLicenseesLoading(false);
    }
  };


  const loadCountries = async () => {
    setCountriesLoading(true);
    try {
      const countriesData = await fetchCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setCountriesLoading(false);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleBillValidatorChange = (denom: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      billValidatorOptions: {
        ...prev.billValidatorOptions,
        [denom]: checked,
      },
    }));
  };

  const handleLocationSelect = (location: SelectedLocation) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      // Update address, city and country if they were provided by the map
      ...(location.address && { street: location.address }),
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
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
      },
      (error) => {
        console.error("Error getting current location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.licencee) {
        throw new Error("Please fill in all required fields");
      }

      // Convert dayStartTime (HH:MM) to gameDayOffset (number of hours)
      const gameDayOffset = parseInt(formData.dayStartTime.split(":")[0]);

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

      // Add location by calling API directly
      const response = await axios.post("/api/locations", locationData);
      console.warn("Location created successfully:", response.data);

        address: formData.street, // Just pass the street as address string
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        licencee: formData.licencee, // Use selected licensee from form
        billValidatorOptions: formData.billValidatorOptions,
      };

      // Add location
      const createdLocation = await createLocation(locationData);
      console.warn("Location created successfully:", createdLocation);

      // Show success message
      toast.success("Location added successfully");

      // Close modal and refresh
      console.warn("Calling onCreated callback...");
      onCreated?.();
      onClose();
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add location"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl w-full mx-2 sm:mx-4 md:mx-0 p-0 overflow-hidden bg-white max-h-[95vh] md:max-h-[90vh]">
        <DialogHeader className="p-4 md:p-6 border-b border-gray-200">
          <DialogTitle className="text-xl md:text-2xl font-bold text-gray-800">
            Add New Location
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[calc(95vh-120px)] md:max-h-[calc(90vh-120px)] overflow-y-auto"
        >



          {/* Location Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-2">
              Location Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter location name"
              className="w-full h-12 bg-container border-border text-base"
            />
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-2">
              Address
            </label>
            <Input
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              placeholder="Street"
              className="w-full h-12 bg-container border-border text-base"
            />
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-2">
              City
            </label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleInputChange}

              placeholder="Enter city name"

              placeholder="City"
              className="w-full h-12 bg-container border-border text-base"
            />
          </div>

          {/* Country and Profit Share - Mobile: Stacked, Desktop: Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-grayHighlight mb-2">
                Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={(e) => handleSelectChange("country", e.target.value)}
                className="w-full h-12 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
              >
                <option value="">Select Country</option>
                {countriesLoading ? (
                  <option value="" disabled>
                    Loading countries...
                  </option>
                ) : (
                  countries.map((country) => (
                    <option key={country._id} value={country._id}>
                      {country.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grayHighlight mb-2">
                Profit Share (%)
              </label>
              <Input
                name="profitShare"
                type="number"
                min="0"
                max="100"
                value={formData.profitShare}
                onChange={handleInputChange}
                placeholder="50"
                className="w-full h-12 bg-container border-border text-base"
              />
            </div>
          </div>

          {/* Licensee */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-2">
              Licensee <span className="text-red-500">*</span>
            </label>
            <select
              name="licencee"
              value={formData.licencee}
              onChange={(e) => handleSelectChange("licencee", e.target.value)}
              className="w-full h-12 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
              required
            >
              <option value="">Select Licensee</option>
              {licenseesLoading ? (
                <option value="" disabled>
                  Loading licensees...
                </option>
              ) : (
                licensees.map((licensee) => (
                  <option key={licensee._id} value={licensee._id}>
                    {licensee.name}
                  </option>
                ))
              )}
            </select>
          </div>


          {/* Day Start Time */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-2">
              Day Start Time
            </label>
            <select
              name="dayStartTime"
              value={formData.dayStartTime}
              onChange={(e) =>
                handleSelectChange("dayStartTime", e.target.value)
              }
              className="w-full h-12 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>


          {/* Checkboxes - Mobile: Stacked, Desktop: Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* No SMIB Location Checkbox */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                id="isLocalServer"
                checked={formData.isLocalServer}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("isLocalServer", checked === true)
                }
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
              />

              <Label
                htmlFor="isLocalServer"
                className="text-sm font-medium flex-1"
              >

              <Label htmlFor="isLocalServer" className="text-sm font-medium flex-1">
                No SMIB Location
              </Label>
            </div>

            {/* Map Toggle */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                id="useMap"
                checked={useMap}

                onCheckedChange={(checked) => {
                  setUseMap(checked === true);
                  if (checked === true) {
                    getCurrentLocation();
                  }
                }}

                onCheckedChange={(checked) => setUseMap(checked === true)}
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
              />
              <Label htmlFor="useMap" className="text-sm font-medium flex-1">
                Use Map to Select Location
              </Label>
            </div>
          </div>

          {/* GEO Coordinates - Mobile: Stacked, Desktop: Side by side */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-3">GEO Coordinates</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-3 px-4 min-w-[80px]">
                  <span className="text-sm font-medium">Latitude</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="border-0 bg-transparent w-full h-12 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    readOnly={useMap}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-3 px-4 min-w-[80px]">
                  <span className="text-sm font-medium">Longitude</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="border-0 bg-transparent w-full h-12 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
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
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md relative z-10">
                  <p className="text-xs text-yellow-700">

                    ⚠️ Map hasn&apos;t loaded properly. Please uncheck and check
                    the &quot;Use Map&quot; button again.

                          ⚠️ Map hasn&apos;t loaded properly. Please uncheck and check the &quot;Use Map&quot; button again.
                  </p>
                </div>
              )}
              <LocationPickerMap
                initialLat={
                  formData.latitude ? parseFloat(formData.latitude) : 10.6599
                }
                initialLng={
                  formData.longitude ? parseFloat(formData.longitude) : -61.5199
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
            <label className="block text-sm font-medium text-grayHighlight mb-3">
              Bill Validator Denominations
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { key: "denom1", label: "$1" },
                { key: "denom2", label: "$2" },
                { key: "denom5", label: "$5" },
                { key: "denom10", label: "$10" },
                { key: "denom20", label: "$20" },
                { key: "denom50", label: "$50" },
                { key: "denom100", label: "$100" },
                { key: "denom200", label: "$200" },
                { key: "denom500", label: "$500" },
                { key: "denom1000", label: "$1,000" },
                { key: "denom2000", label: "$2,000" },
                { key: "denom5000", label: "$5,000" },
                { key: "denom10000", label: "$10,000" },
              ].map(({ key, label }) => (

                <div
                  key={key}
                  className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg"
                >

                <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <Checkbox
                    id={key}
                    checked={
                      formData.billValidatorOptions[
                        key as keyof typeof formData.billValidatorOptions
                      ] as boolean
                    }
                    onCheckedChange={(checked) =>
                      handleBillValidatorChange(key, checked === true)
                    }
                    className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
                  />
                  <Label htmlFor={key} className="text-sm font-medium flex-1">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 h-12 bg-buttonActive hover:bg-buttonActive/90 text-white text-base"
            >
              {isLoading ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
