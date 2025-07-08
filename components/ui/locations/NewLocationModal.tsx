"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationStore } from "@/lib/store/locationStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { getNames } from "country-list";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Search, Grid, List } from "lucide-react";

const LocationPickerMap = dynamic(
  () => import("@/components/ui/locations/LocationPickerMap"),
  { ssr: false }
);

const POS_LAT = 10.6549;
const POS_LNG = -61.5019;

interface NewLocationModalProps {
  onLocationAdded: () => void;
}

const ALLOWED_COUNTRIES = [
  { name: "Trinidad and Tobago", code: "tt" },
  { name: "Guyana", code: "gy" },
  { name: "Barbados", code: "bb" },
];

function getCountryCodeByName(name: string) {
  const found = ALLOWED_COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
  return found ? found.code : "tt";
}

export const NewLocationModal: React.FC<NewLocationModalProps> = ({
  onLocationAdded,
}) => {
  const { isLocationModalOpen, closeLocationModal } = useLocationStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [useMap, setUseMap] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLat, setInitialLat] = useState(POS_LAT);
  const [initialLng, setInitialLng] = useState(POS_LNG);
  const [locationReady, setLocationReady] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [detectedCountry, setDetectedCountry] = useState<string>("Trinidad and Tobago");
  const [countryCode, setCountryCode] = useState<string>("tt");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    country: "Guyana",
    profitShare: "",
    isLocalServer: false,
    latitude: "",
    longitude: "",
    licensee: "",
  });

  const [loading, setLoading] = useState(false);

  const countryNames = getNames();

  // Handle modal animations
  useEffect(() => {
    if (isLocationModalOpen) {
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
  }, [isLocationModalOpen]);

  // Map animation on toggle
  useEffect(() => {
    if (useMap) {
      const mapContainer = document.querySelector('.map-container');
      if (mapContainer) {
        gsap.fromTo(
          mapContainer,
          { 
            opacity: 0, 
            y: -20,
            scale: 0.95
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
          }
        );
      }
    }
  }, [useMap]);

  // Default location logic
  useEffect(() => {
    // Try browser geolocation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInitialLat(pos.coords.latitude);
        setInitialLng(pos.coords.longitude);
        setLocationReady(true);
      },
      async () => {
        // Fallback to IP geolocation
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            setInitialLat(data.latitude);
            setInitialLng(data.longitude);
          } else {
            setInitialLat(POS_LAT);
            setInitialLng(POS_LNG);
          }
        } catch {
          setInitialLat(POS_LAT);
          setInitialLng(POS_LNG);
        }
        setLocationReady(true);
      },
      { timeout: 5000 }
    );
  }, []);

  // Clear all fields when modal opens
  useEffect(() => {
    if (isLocationModalOpen) {
      setFormData({
        name: "",
        address: "",
        country: "Guyana",
        profitShare: "",
        isLocalServer: false,
        latitude: "",
        longitude: "",
        licensee: "",
      });
      setSearchQuery("");
    }
  }, [isLocationModalOpen]);

  // On modal open, prompt for geolocation
  useEffect(() => {
    if (isLocationModalOpen) {
      // Try browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            // Reverse geocode to get country
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const country = data.address?.country || "Trinidad and Tobago";
            let allowed = ALLOWED_COUNTRIES.find(c => c.name.toLowerCase() === country.toLowerCase());
            if (!allowed) allowed = ALLOWED_COUNTRIES[0];
            setDetectedCountry(allowed.name);
            setCountryCode(allowed.code);
          },
          async () => {
            // If denied, use IP geolocation
            try {
              const res = await fetch("https://ipapi.co/json/");
              const data = await res.json();
              const country = data.country_name || "Trinidad and Tobago";
              let allowed = ALLOWED_COUNTRIES.find(c => c.name.toLowerCase() === country.toLowerCase());
              if (!allowed) allowed = ALLOWED_COUNTRIES[0];
              setDetectedCountry(allowed.name);
              setCountryCode(allowed.code);
            } catch {
              setDetectedCountry("Trinidad and Tobago");
              setCountryCode("tt");
            }
          },
          { timeout: 5000 }
        );
      } else {
        setDetectedCountry("Trinidad and Tobago");
        setCountryCode("tt");
      }
    }
  }, [isLocationModalOpen]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=${countryCode}`)
        .then(res => res.json())
        .then(data => setSuggestions(data || []));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, countryCode]);

  const handleClose = () => {
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
      onComplete: closeLocationModal,
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

  const handleLocationSelect = (selectedLocation: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: selectedLocation.lat.toFixed(6),
      longitude: selectedLocation.lng.toFixed(6),
      address: selectedLocation.address,
    }));
  };

  const handleSuggestionSelect = (s: any) => {
    setSearchQuery(s.display_name);
    setSuggestions([]);
    if (s.lat && s.lon) {
      // Only update the form fields when a suggestion is selected
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(s.lat).toFixed(6),
        longitude: parseFloat(s.lon).toFixed(6),
        address: s.display_name,
      }));
      // Optionally, you can also update the map position by calling handleLocationSelect
      handleLocationSelect({ lat: parseFloat(s.lat), lng: parseFloat(s.lon), address: s.display_name });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const locationData = {
        name: formData.name,
        address: {
          street: formData.address,
          line2: "",
          city: "",
        },
        country: formData.country,
        profitShare: parseInt(formData.profitShare),
        rel: {
          licensee: formData.licensee,
        },
        isLocalServer: formData.isLocalServer,
        geoCoords: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
      };

      await axios.post("/api/locations", locationData);
      toast.success("Location created successfully!");
      onLocationAdded();
      handleClose();
      // You might want to refresh the locations list after adding a new one
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating location:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLocationModalOpen) return null;

  // Desktop View
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Desktop Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-blue-50 rounded-md shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          <div className="p-4">
            <h2 className="text-xl font-semibold text-center mb-4">
              New Location
            </h2>
          </div>

          <div className="px-4 sm:px-8 pb-8 space-y-4">
            {/* Location Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Location Name
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Mixtura Brasileira 2 LT"
                className="w-full bg-container border-border"
              />
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Address
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street"
                className="w-full bg-container border-border"
              />
            </div>

            {/* Country */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grayHighlight mb-1">
                Country
              </label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleSelectChange("country", value)}
              >
                <SelectTrigger className="bg-container border-border">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countryNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profit Share and Day Start Time */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Profit Share</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="profitShare"
                    value={formData.profitShare}
                    onChange={handleInputChange}
                    className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <span className="pr-4">%</span>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                  <span className="text-sm font-medium">Day Start Time</span>
                </div>
                <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                  <Input
                    name="dayStartTime"
                    value="Curr. day, 08:00"
                    readOnly
                    className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>

            {/* No SMIB Location */}
            <div className="mb-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noSMIBLocation"
                  checked={formData.isLocalServer}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("isLocalServer", checked === true)
                  }
                  className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
                />
                <Label
                  htmlFor="noSMIBLocation"
                  className="text-sm font-medium"
                >
                  No SMIB Location
                </Label>
              </div>
            </div>

            {/* GEO Coordinates */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">GEO Coordinates</p>
              {/* Map Toggle Checkbox */}
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="useMap"
                  checked={useMap}
                  onCheckedChange={(checked) => setUseMap(checked === true)}
                  className="text-buttonActive border-buttonActive focus:ring-buttonActive"
                />
                <Label htmlFor="useMap" className="font-medium text-gray-700">
                  Use Map to Select Location
                </Label>
              </div>
              {/* Coordinate Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center">
                  <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
                    <span className="text-sm font-medium">Latitude</span>
                  </div>
                  <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
                    <Input
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                      readOnly={useMap}
                      placeholder="6.809985"
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
                      className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                      readOnly={useMap}
                      placeholder="-58.166204"
                    />
                  </div>
                </div>
              </div>
              {/* Search bar and map type toggle above the map */}
              {useMap && (
                <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center relative">
                  <div className="relative w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="Search for a location..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full sm:w-auto"
                      autoComplete="off"
                    />
                    {/* Suggestions dropdown */}
                    {searchQuery.length > 2 && suggestions.length > 0 && (
                      <ul className="absolute z-[1000] left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                        {suggestions.map((s, idx) => (
                          <li
                            key={idx}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            onClick={() => handleSuggestionSelect(s)}
                          >
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={mapType === 'street' ? 'default' : 'outline'}
                      onClick={() => setMapType('street')}
                    >
                      Street
                    </Button>
                    <Button
                      type="button"
                      variant={mapType === 'satellite' ? 'default' : 'outline'}
                      onClick={() => setMapType('satellite')}
                    >
                      Satellite
                    </Button>
                  </div>
                </div>
              )}
              {/* Map Component */}
              {useMap && locationReady && (
                <LocationPickerMap
                  initialLat={parseFloat(formData.latitude) || initialLat}
                  initialLng={parseFloat(formData.longitude) || initialLng}
                  mapType={mapType}
                  onMapTypeChange={setMapType}
                  searchQuery={searchQuery}
                  onLocationSelect={handleLocationSelect}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
              <Button
                className="bg-button hover:bg-button/90 text-primary-foreground px-6 w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                className="border-button text-button hover:bg-button/10 px-6 w-full sm:w-auto"
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
};
