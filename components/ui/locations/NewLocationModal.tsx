"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocationStore } from "@/lib/store/locationStore";
import LocationPickerMap from "./LocationPickerMap";
import { SelectedLocation, LocationCoordinates } from "@/lib/types/maps";

interface NewLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewLocationModal({ isOpen, onClose }: NewLocationModalProps) {
  const router = useRouter();
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
  });
  const [useMap, setUseMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);

  // Detect user location on modal open
  useEffect(() => {
    if (isOpen) {
      detectUserLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      });
      setUseMap(false);
    }
  }, [isOpen]);

  const detectUserLocation = async () => {
    setIsDetectingLocation(true);
    
    try {
      // First try to get user's browser location
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });

        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Get address from coordinates using reverse geocoding
        const address = await getAddressFromCoordinates(latitude, longitude);
        
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          country: address.country || "Trinidad and Tobago",
          city: address.city || "",
        }));

        // Don't show toast for browser location detection
        return;
      }
    } catch {
      console.log("Browser location access denied or failed, trying IP-based location");
    }

    try {
      // Fallback to IP-based location detection
      const ipLocation = await getLocationFromIP();
      setUserLocation({ lat: ipLocation.latitude, lng: ipLocation.longitude });
      
      setFormData(prev => ({
        ...prev,
        latitude: ipLocation.latitude.toFixed(6),
        longitude: ipLocation.longitude.toFixed(6),
        country: ipLocation.country || "Trinidad and Tobago",
        city: ipLocation.city || "",
      }));

      // Don't show toast for IP location detection
    } catch {
      console.log("IP location detection failed, using default");
      
      // Final fallback to Trinidad and Tobago POS
      const defaultLat = 10.6599;
      const defaultLng = -61.5199;
      setUserLocation({ lat: defaultLat, lng: defaultLng });
      
      setFormData(prev => ({
        ...prev,
        latitude: defaultLat.toFixed(6),
        longitude: defaultLng.toFixed(6),
        country: "Trinidad and Tobago",
        city: "Port of Spain",
      }));

      // Don't show toast for default location
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<{ country: string; city: string }> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const result = data.results[0];
        let country = "";
        let city = "";
        
        for (const component of result.address_components) {
          const types = component.types;
          
          if (types.includes("locality")) {
            city = component.long_name;
          } else if (types.includes("administrative_area_level_1") && !city) {
            // Fallback to state/province if no city found
            city = component.long_name;
          }
          
          if (types.includes("country")) {
            country = component.long_name;
          }
        }
        
        return { country, city };
      }
    } catch {
      console.error("Error getting address from coordinates:");
    }
    
    return { country: "Trinidad and Tobago", city: "" };
  };

  const getLocationFromIP = async (): Promise<{ latitude: number; longitude: number; country: string; city: string }> => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        country: data.country_name || "Trinidad and Tobago",
        city: data.city || "",
      };
    } catch {
      console.error("Error getting location from IP:");
      throw new Error("Failed to get location from IP");
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

  const handleLocationSelect = (location: SelectedLocation) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      // Update city and country if they were provided by the map
      ...(location.city && { city: location.city }),
      ...(location.country && { country: location.country }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.street) {
        throw new Error("Please fill in all required fields");
      }

      // Create location object matching the expected interface
      const locationData = {
        name: formData.name,
        address: formData.street, // Just pass the street as address string
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      // Add location
      await createLocation(locationData);

      // Show success message
      toast.success("Location added successfully");

      // Close modal and refresh
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add location");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Add New Location
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Location Detection Status */}
          {isDetectingLocation && !formData.latitude && !formData.longitude && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                🔍 Detecting your location...
              </p>
            </div>
          )}

          {/* Location Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-1">
              Location Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter location name"
              className="w-full bg-container border-border"
            />
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <Input
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              placeholder="Street"
              className="w-full bg-container border-border"
            />
          </div>

          {/* Line 2 */}
          <div className="mb-4">
            <Input
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="City"
              className="w-full bg-container border-border"
            />
          </div>

          {/* City and Country */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={(e) => handleSelectChange("country", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              >
                <option value="">Select Country</option>
                <option value="Guyana">Guyana</option>
                <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                <option value="Barbados">Barbados</option>
                <option value="Jamaica">Jamaica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grayHighlight mb-1">
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
                className="w-full bg-container border-border"
              />
            </div>
          </div>

          {/* Licensee */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-grayHighlight mb-1">
              Licensee
            </label>
            <Input
              name="licencee"
              value={formData.licencee}
              onChange={handleInputChange}
              placeholder="Enter licensee"
              className="w-full bg-container border-border"
            />
          </div>

          {/* No SMIB Location Checkbox */}
          <div className="mb-4 flex justify-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isLocalServer"
                checked={formData.isLocalServer}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("isLocalServer", checked === true)
                }
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
              />
              <Label
                htmlFor="isLocalServer"
                className="text-sm font-medium"
              >
                No SMIB Location
              </Label>
            </div>
          </div>

          {/* Map Toggle */}
          <div className="mb-4 flex items-center space-x-2">
            <Checkbox
              id="useMap"
              checked={useMap}
              onCheckedChange={(checked) => setUseMap(checked === true)}
              className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
            />
            <Label htmlFor="useMap" className="text-sm font-medium">
              Use Map to Select Location
            </Label>
          </div>

          {/* GEO Coordinates */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">GEO Coordinates</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Latitude</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly={useMap}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Longitude</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="0.000000"
                    className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                    readOnly={useMap}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Map Component with Integrated Search */}
          {useMap && (
            <div className="mt-4">
              <LocationPickerMap
                initialLat={formData.latitude ? parseFloat(formData.latitude) : 10.6599}
                initialLng={formData.longitude ? parseFloat(formData.longitude) : -61.5199}
                mapType="street"
                onLocationSelect={handleLocationSelect}
                userLocation={userLocation}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-buttonActive hover:bg-buttonActive/90 text-white"
            >
              {isLoading ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
