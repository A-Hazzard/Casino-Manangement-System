'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { Search, MapPin, Globe, X } from 'lucide-react';
import { LocationPickerMapProps, PlaceSuggestion } from '@/lib/types/maps';

const libraries: 'places'[] = ['places'];

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat,
  initialLng,
  mapType,
  onLocationSelect,
  onMapLoadError,
  onMapLoadSuccess,
}) => {
  // Load Google Maps API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Debug API key loading
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps API Error:', loadError);
      console.error(
        'API Key:',
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'
      );
      console.error('Current domain:', window.location.hostname);
      // Call the error handler if provided
      onMapLoadError?.();
    }
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.error(
        'Google Maps API Key is missing from environment variables'
      );
      // Call the error handler if provided
      onMapLoadError?.();
    } else {
      console.warn('Google Maps API Key loaded successfully');
    }
  }, [loadError, onMapLoadError]);

  // Call success handler when map is loaded
  useEffect(() => {
    if (isLoaded && !loadError) {
      onMapLoadSuccess?.();
    }
  }, [isLoaded, loadError, onMapLoadSuccess]);

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
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
        mapType === 'satellite'
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
            let city = '';
            let country = '';

            // Extract city and country from address components
            for (const component of result.address_components) {
              const types = component.types;

              if (types.includes('locality')) {
                city = component.long_name;
              } else if (
                types.includes('administrative_area_level_1') &&
                !city
              ) {
                // Fallback to state/province if no city found
                city = component.long_name;
              }

              if (types.includes('country')) {
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
              .map(place => {
                const lat = place.geometry?.location?.lat() || 0;
                const lng = place.geometry?.location?.lng() || 0;

                const isLocal = false;

                return {
                  id: place.place_id || Math.random().toString(),
                  name: place.name || 'Unknown Place',
                  address: place.formatted_address || '',
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
        console.error('Error searching places:', error);
        setSuggestions([]);
        setIsSearching(false);
      }
    },
    [isLoaded]
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
      const addressParts = suggestion.address.split(', ');
      let city = '';
      let country = '';

      // Try to find city and country from address parts
      if (addressParts.length >= 2) {
        // Usually the second-to-last part is the city/state
        city = addressParts[addressParts.length - 2] || '';
        // Last part is usually the country
        country = addressParts[addressParts.length - 1] || '';
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
    setSearchQuery('');
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50"
      >
        <div className="p-4 text-center text-red-600">
          <p className="mb-2 font-medium">Failed to load Google Maps</p>
          <p className="mb-2 text-sm">This could be due to:</p>
          <ul className="space-y-1 text-left text-xs">
            <li>• API key restrictions (check Google Cloud Console)</li>
            <li>• Domain not authorized for this API key</li>
            <li>• API key quota exceeded</li>
            <li>• Internet connection issues</li>
          </ul>
          <p className="mt-2 text-xs">Check browser console for more details</p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (!isLoaded) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center rounded-lg bg-gray-100"
      >
        <div className="p-4 text-center text-gray-500">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p>Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      {/* Search Bar */}
      <div className="absolute left-4 top-4 z-10 w-80 max-w-[calc(100%-2rem)]">
        <div className="relative" ref={searchInputRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for places, addresses, or landmarks..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 transform">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                    index === 0 ? 'rounded-t-lg' : ''
                  } ${index === suggestions.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {suggestion.isLocal ? (
                        <MapPin className="h-4 w-4 text-green-600" />
                      ) : (
                        <Globe className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {suggestion.name}
                        </p>
                        {suggestion.isLocal && (
                          <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Local
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
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
        zoom={10}
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
