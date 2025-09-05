"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { Search, MapPin, Globe, X } from "lucide-react";
import { LocationPickerMapProps, PlaceSuggestion } from "@/lib/types/maps";

const libraries: "places"[] = ["places"];

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "0.5rem",
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat,
  initialLng,
  mapType,
  onLocationSelect,
  userLocation,
}) => {
  // Load Google Maps API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Refs for cleanup and services
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null
  );
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Memoized map options - only create when google is loaded
  const mapOptions = useMemo(() => {
    if (!isLoaded || !window.google) return {};

    return {
      mapTypeId:
        mapType === "satellite"
          ? window.google.maps.MapTypeId.SATELLITE
          : window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
    };
  }, [mapType, isLoaded]);

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Handle map load
  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      if (!isLoaded || !window.google) return;

      setMap(mapInstance);

      // Initialize services
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        mapInstance
      );
      geocoderRef.current = new window.google.maps.Geocoder();
    },
    [isLoaded]
  );

  // Update location from coordinates
  const updateLocationFromCoords = useCallback(
    (lat: number, lng: number) => {
      if (!geocoderRef.current || !isLoaded || !window.google) return;

      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
            const result = results[0];
            let city = "";
            let country = "";

            // Extract city and country from address components
            for (const component of result.address_components) {
              const types = component.types;

              if (types.includes("locality")) {
                city = component.long_name;
              } else if (
                types.includes("administrative_area_level_1") &&
                !city
              ) {
                // Fallback to state/province if no city found
                city = component.long_name;
              }

              if (types.includes("country")) {
                country = component.long_name;
              }
            }

            onLocationSelect({
              lat,
              lng,
              address: result.formatted_address,
              city,
              country,
            });
          }
        }
      );
    },
    [onLocationSelect, isLoaded]
  );

  // Handle map click
  const onMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setCenter({ lat, lng });
        updateLocationFromCoords(lat, lng);
      }
    },
    [updateLocationFromCoords]
  );

  // Handle marker drag end
  const onMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setCenter({ lat, lng });
        updateLocationFromCoords(lat, lng);
      }
    },
    [updateLocationFromCoords]
  );

  // Search places with debouncing
  const searchPlaces = useCallback(
    async (query: string) => {
      if (
        !query.trim() ||
        query.length < 2 ||
        !placesServiceRef.current ||
        !isLoaded ||
        !window.google
      ) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      setShowSuggestions(true);

      try {
        const request: google.maps.places.TextSearchRequest = {
          query,
        };

        placesServiceRef.current.textSearch(request, (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            const placeSuggestions: PlaceSuggestion[] = results
              .slice(0, 8)
              .map((place) => {
                const lat = place.geometry?.location?.lat() || 0;
                const lng = place.geometry?.location?.lng() || 0;

                const isLocal = userLocation
                  ? calculateDistance(
                      lat,
                      lng,
                      userLocation.lat,
                      userLocation.lng
                    ) < 50
                  : false;

                return {
                  id: place.place_id || Math.random().toString(),
                  name: place.name || "Unknown Place",
                  address: place.formatted_address || "",
                  lat,
                  lng,
                  isLocal,
                };
              });

            // Sort by local first
            const sortedSuggestions = placeSuggestions.sort((a, b) => {
              if (a.isLocal && !b.isLocal) return -1;
              if (!a.isLocal && b.isLocal) return 1;
              return 0;
            });

            setSuggestions(sortedSuggestions);
          } else {
            setSuggestions([]);
          }
          setIsSearching(false);
        });
      } catch (error) {
        console.error("Error searching places:", error);
        setSuggestions([]);
        setIsSearching(false);
      }
    },
    [calculateDistance, userLocation, isLoaded]
  );

  // Handle search input change with debouncing
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (query.trim()) {
        // Debounce search to prevent excessive API calls
        searchTimeoutRef.current = setTimeout(() => {
          searchPlaces(query);
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [searchPlaces]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      setSearchQuery(suggestion.name);
      setShowSuggestions(false);
      setCenter({ lat: suggestion.lat, lng: suggestion.lng });

      if (map) {
        map.panTo({ lat: suggestion.lat, lng: suggestion.lng });
        map.setZoom(16);
      }

      // Extract city from the address for suggestions
      const addressParts = suggestion.address.split(", ");
      let city = "";
      let country = "";

      // Try to find city and country from address parts
      if (addressParts.length >= 2) {
        // Usually the second-to-last part is the city/state
        city = addressParts[addressParts.length - 2] || "";
        // Last part is usually the country
        country = addressParts[addressParts.length - 1] || "";
      }

      onLocationSelect({
        lat: suggestion.lat,
        lng: suggestion.lng,
        address: suggestion.address,
        city,
        country,
      });
    },
    [map, onLocationSelect]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle loading error
  if (loadError) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
      >
        <div className="text-center text-red-600 p-4">
          <p className="font-medium mb-2">Failed to load Google Maps</p>
          <p className="text-sm">
            Please check your API key and internet connection
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (!isLoaded) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-center text-gray-500 p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, position: "relative" }}>
      {/* Recenter to user location button */}
      {userLocation && (
        <button
          type="button"
          onClick={() => {
            if (!map) return;
            map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
            map.setZoom(16);
            setCenter({ lat: userLocation.lat, lng: userLocation.lng });
            updateLocationFromCoords(userLocation.lat, userLocation.lng);
          }}
          className="absolute z-10 right-4 top-4 bg-white border border-gray-300 rounded-md shadow px-3 py-2 text-sm hover:bg-gray-50"
        >
          My location
        </button>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)]">
        <div className="relative" ref={searchInputRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for places, addresses, or landmarks..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-lg shadow-lg text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 ${
                    index === 0 ? "rounded-t-lg" : ""
                  } ${index === suggestions.length - 1 ? "rounded-b-lg" : ""}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {suggestion.isLocal ? (
                        <MapPin className="h-4 w-4 text-green-600" />
                      ) : (
                        <Globe className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.name}
                        </p>
                        {suggestion.isLocal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Local
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {suggestion.address}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={onMapClick}
      >
        <Marker
          position={center}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
        />
      </GoogleMap>
    </div>
  );
};

export default LocationPickerMap;
