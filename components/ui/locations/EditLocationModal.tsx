"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { EditLocationModalProps } from "@/lib/types/components";
import { createActivityLogger } from "@/lib/helpers/activityLogger";
import { fetchLicensees } from "@/lib/helpers/licensees";
import type { Licensee } from "@/lib/types/licensee";
import LocationPickerMap from "./LocationPickerMap";
import { SelectedLocation } from "@/lib/types/maps";

type LocationDetails = {
  _id: string;
  name: string;
  address?: {
    street: string;
    city: string;
  };
  country?: string;
  profitShare?: number;
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
};

export default function EditLocationModal({
  onLocationUpdated,
}: EditLocationModalProps) {
  const { isEditModalOpen, selectedLocation, closeEditModal } =
    useLocationActionsStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails | null>(null);
  const [locationDetailsLoading, setLocationDetailsLoading] = useState(false);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);
  const [useMap, setUseMap] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const locationLogger = createActivityLogger("location");

  const [formData, setFormData] = useState({
    name: "",
    street: "",
    city: "",
    country: "Guyana",
    profitShare: "50",
    licencee: "",
    isLocalServer: false,
    latitude: "",
    longitude: "",
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

  // Fetch full location details when modal opens
  const fetchLocationDetails = async (locationId: string) => {
    setLocationDetailsLoading(true);
    try {
      const response = await axios.get(`/api/locations/${locationId}`);
      if (response.data.success) {
        setLocationDetails(response.data.location);
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
      toast.error("Failed to load location details");
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
      console.error("Failed to fetch licensees:", error);
      toast.error("Failed to load licensees");
    } finally {
      setLicenseesLoading(false);
    }
  };

  // Initialize form data when a location is selected
  useEffect(() => {
    if (selectedLocation && selectedLocation.location) {
      // Fetch full location details to get billValidatorOptions and other fields
      fetchLocationDetails(selectedLocation.location);

      setFormData({
        name: selectedLocation.locationName || "",
        street: "", // AggregatedLocation doesn't have address details
        city: "", // AggregatedLocation doesn't have address details
        country: "Guyana", // Default since AggregatedLocation doesn't have this
        profitShare: "50", // Default since AggregatedLocation doesn't have this
        licencee: "", // AggregatedLocation doesn't have this
        isLocalServer: selectedLocation.isLocalServer || false,
        latitude: "8.909985", // Default since AggregatedLocation doesn't have coordinates
        longitude: "-58.186204", // Default since AggregatedLocation doesn't have coordinates
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

  // Load licensees when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      loadLicensees();
    }
  }, [isEditModalOpen]);

  // Detect user location

  // Handle location selection from map
  const handleLocationSelect = (location: SelectedLocation) => {
    setFormData((prev) => ({
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

  // Update form data when location details are fetched
  useEffect(() => {
    if (locationDetails) {
      setFormData((prev) => ({
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
          ease: "power2.out",
          overwrite: true,
        }
      );

      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
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
      ease: "power2.in",
      overwrite: true,
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      overwrite: true,
      onComplete: closeEditModal,
    });
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
    setFormData((prev) => {
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
      if (process.env.NODE_ENV === "development") {
        console.error("No location selected");
      }
      return;
    }

    if (!formData.name) {
      toast.error("Location name is required");
      return;
    }

    try {
      setLoading(true);

      // Use the location field from AggregatedLocation as identifier
      const locationIdentifier = selectedLocation.location;

      if (!locationIdentifier) {
        toast.error("Location identifier not found");
        return;
      }

      const locationData = {
        locationName: locationIdentifier,
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare),
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

      const previousData = { ...selectedLocation };

      await axios.put("/api/locations", locationData);

      // Log the update activity
      await locationLogger.logUpdate(
        locationIdentifier,
        formData.name,
        previousData,
        locationData,
        `Updated location: ${formData.name}`
      );

      toast.success("Location updated successfully");
      console.warn("Calling onLocationUpdated callback");
      onLocationUpdated?.();
      handleClose();
    } catch (error) {
      console.error("Error updating location:", error);
      toast.error("Failed to update location");
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
          className="bg-container rounded-md shadow-lg max-w-xl lg:max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          {/* Header */}
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-center flex-1">
              Edit Location Details
            </h2>
            <Button
              variant="ghost"
              className="text-pinkHighlight hover:bg-pinkHighlight/10 border-2 border-pinkHighlight ml-2 flex items-center"
              onClick={() => {
                useLocationActionsStore
                  .getState()
                  .openDeleteModal(selectedLocation);
              }}
              aria-label="Delete Location"
            >
              <Trash2 className="w-5 h-5 mr-1" />
              Delete
            </Button>
          </div>

          {/* Form Content */}
          <div className="px-4 md:px-8 pb-4 md:pb-8 space-y-4 max-h-[calc(95vh-120px)] md:max-h-[calc(90vh-120px)] overflow-y-auto">
            {locationDetailsLoading ? (
              // Show skeleton content while loading
              <>
                {/* Location Name */}
                <div className="mb-4">
                  <div className="h-4 w-24 mb-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Address */}
                <div className="mb-4">
                  <div className="h-4 w-16 mb-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                </div>

                {/* City */}
                <div className="mb-4">
                  <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Licensee */}
                <div className="mb-4">
                  <div className="h-4 w-20 mb-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Profit Share and Day Start Time */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <div className="h-12 w-24 bg-gray-200 rounded-l-md animate-pulse" />
                    <div className="h-12 flex-1 bg-gray-200 rounded-r-md animate-pulse" />
                  </div>
                  <div className="flex items-center">
                    <div className="h-12 w-24 bg-gray-200 rounded-l-md animate-pulse" />
                    <div className="h-12 flex-1 bg-gray-200 rounded-r-md animate-pulse" />
                  </div>
                </div>

                {/* No SMIB Location Checkbox */}
                <div className="mb-4 flex justify-center">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>

                {/* GEO Coordinates */}
                <div className="mb-4">
                  <div className="h-4 w-32 mb-3 bg-gray-200 rounded animate-pulse" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="h-12 w-20 bg-gray-200 rounded-l-md animate-pulse" />
                      <div className="h-12 flex-1 bg-gray-200 rounded-r-md animate-pulse" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-12 w-20 bg-gray-200 rounded-l-md animate-pulse" />
                      <div className="h-12 flex-1 bg-gray-200 rounded-r-md animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Bill Validator Options */}
                <div className="mb-4">
                  <div className="flex justify-center mb-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 13 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                  <div className="h-12 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </>
            ) : (
              // Show actual form content when loaded
              <>
                {/* Location Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-grayHighlight mb-2">
                    Location Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="w-full h-12 bg-container border-border text-base"
                  />
                </div>

                {/* Country */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-grayHighlight mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={(e) =>
                      handleSelectChange("country", e.target.value)
                    }
                    className="w-full h-12 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
                  >
                    <option value="">Select Country</option>
                    <option value="Guyana">Guyana</option>
                    <option value="Trinidad and Tobago">
                      Trinidad and Tobago
                    </option>
                  </select>
                </div>

                {/* Licensee */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-grayHighlight mb-2">
                    Licensee <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="licencee"
                    value={formData.licencee}
                    onChange={(e) =>
                      handleSelectChange("licencee", e.target.value)
                    }
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

                {/* Profit Share and Day Start Time - Mobile: Stacked, Desktop: Side by side */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <div className="bg-button text-primary-foreground rounded-l-md py-3 px-4 min-w-[100px]">
                      <span className="text-sm font-medium">Profit Share</span>
                    </div>
                    <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                      <Input
                        name="profitShare"
                        value={formData.profitShare}
                        onChange={handleInputChange}
                        className="focus-visible:ring-0 focus-visible:ring-offset-0 border-l-none border-none h-12 text-base"
                      />
                      <span className="pr-4 text-base">%</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="bg-button text-primary-foreground rounded-l-md py-3 px-4 min-w-[100px]">
                      <span className="text-sm font-medium">
                        Day Start Time
                      </span>
                    </div>
                    <Input
                      name="dayStartTime"
                      value="Curr. day, 08:00"
                      readOnly
                      className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0 h-12 text-base"
                    />
                  </div>
                </div>

                {/* No SMIB Location and Map Toggle */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="noSMIBLocation"
                      checked={formData.isLocalServer}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("isLocalServer", checked === true)
                      }
                      className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
                    />
                    <Label
                      htmlFor="noSMIBLocation"
                      className="text-sm font-medium"
                    >
                      No SMIB Location
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="useMap"
                      checked={useMap}
                      onCheckedChange={(checked) => setUseMap(checked === true)}
                      className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
                    />
                    <Label htmlFor="useMap" className="text-sm font-medium">
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
                      <Input
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        readOnly={useMap}
                        className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0 h-12 text-base"
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="bg-button text-primary-foreground rounded-l-md py-3 px-4 min-w-[80px]">
                        <span className="text-sm font-medium">Longitude</span>
                      </div>
                      <Input
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        readOnly={useMap}
                        className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-container rounded-r-md border border-border border-l-0 h-12 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Map Component */}
                {useMap && (
                  <div className="mt-4">
                    {/* Map Load Error Indicator */}
                    {mapLoadError && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md relative z-10">
                        <p className="text-xs text-yellow-700">
                          ⚠️ Map hasn&apos;t loaded properly. Please uncheck and check the &quot;Use Map&quot; button again.
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
                  <div className="flex justify-center mb-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="billValidatorOptions"
                        checked={Object.values(
                          formData.billValidatorOptions
                        ).some((checked) => checked)}
                        className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[
                      { denom: 1, label: "$1" },
                      { denom: 2, label: "$2" },
                      { denom: 5, label: "$5" },
                      { denom: 10, label: "$10" },
                      { denom: 20, label: "$20" },
                      { denom: 50, label: "$50" },
                      { denom: 100, label: "$100" },
                      { denom: 200, label: "$200" },
                      { denom: 500, label: "$500" },
                      { denom: 1000, label: "$1,000" },
                      { denom: 2000, label: "$2,000" },
                      { denom: 5000, label: "$5,000" },
                      { denom: 10000, label: "$10,000" },
                    ].map(({ denom, label }) => (
                      <div
                        key={denom}
                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <Checkbox
                          id={`denom-${denom}`}
                          checked={
                            formData.billValidatorOptions[
                              `denom${denom}` as keyof typeof formData.billValidatorOptions
                            ]
                          }
                          onCheckedChange={(checked) =>
                            handleBillValidatorChange(
                              `denom${denom}`,
                              checked === true
                            )
                          }
                          className="text-grayHighlight border-buttonActive focus:ring-buttonActive w-5 h-5"
                        />
                        <Label
                          htmlFor={`denom-${denom}`}
                          className="text-sm font-medium flex-1"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                  <Button
                    className="w-full sm:w-auto bg-button hover:bg-button/90 text-primary-foreground px-6 py-3 h-12 text-base"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-button text-button hover:bg-button/10 px-6 py-3 h-12 text-base"
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
