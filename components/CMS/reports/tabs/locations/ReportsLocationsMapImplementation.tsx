/**
 * Reports Locations Map Implementation Component
 * 
 * Actual Leaflet implementation that is only loaded on the client side.
 */

'use client';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import {
  PERFORMANCE_CONFIG,
  getPerformanceLevel as getCommonPerformanceLevel,
} from '@/lib/utils/financial';
import { formatCurrency } from '@/lib/utils/formatting';
import { MapPin, Search, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';

// ============================================================================
// Types
// ============================================================================

type LocationData = {
  id: string;
  name: string;
  coordinates?: [number, number];
  metrics?: {
    gross: number;
    moneyIn: number;
    moneyOut: number;
  };
};

type MapImplementationProps = {
  locations: LocationData[];
  center?: [number, number];
  zoom?: number;
  compact?: boolean;
  financialDataLoading?: boolean;
  loading?: boolean;
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Controller to handle map instance and callbacks
 */
function MapController({
  onMapReady,
}: {
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

/**
 * Automatically fit bounds to show all markers
 */
function MapAutoBounds({ locations }: { locations: LocationData[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || locations.length === 0) return;

    const bounds = locations
      .filter(loc => loc.coordinates && loc.coordinates[0] !== 0)
      .map(loc => loc.coordinates as [number, number]);

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds);
      } catch (e) {
        console.warn('MapAutoBounds: Error fitting bounds', e);
      }
    }
  }, [map, locations]);

  return null;
}

/**
 * Legend for performance indicators
 */
function PerformanceLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:p-3">
      <div className="mb-2 flex items-center gap-2 border-b pb-1 text-xs font-semibold text-gray-700">
        <TrendingUp className="h-3.5 w-3.5" />
        Gross Performance
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
        {Object.entries(PERFORMANCE_CONFIG).map(([level, config]) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full shadow-sm ${config.dotColor}`}
            />
            <span className="text-[10px] font-medium text-gray-600 sm:text-xs">
              {level.charAt(0) + level.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Content for the location popup
 */
function LocationPopupContent({
  location,
  isFinancialDataLoading,
}: {
  location: LocationData;
  isFinancialDataLoading: boolean;
}) {
  const performanceLevel = getCommonPerformanceLevel(
    location.metrics?.gross || 0,
    location.metrics?.moneyIn || 0
  );
  const config = PERFORMANCE_CONFIG[performanceLevel];

  return (
    <div className="min-w-[180px] p-1">
      <div className="mb-2 flex items-center justify-between border-b pb-1">
        <h3 className="font-bold text-gray-900">{location.name}</h3>
        <Tooltip>
          <TooltipTrigger>
            <div
              className={`h-2.5 w-2.5 rounded-full ${config.dotColor}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Performance: {performanceLevel.toLowerCase()}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Gross:</span>
          <span className="font-semibold text-gray-900">
            {isFinancialDataLoading ? '...' : formatCurrency(location.metrics?.gross || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Drop:</span>
          <span className="font-medium text-gray-700">
            {isFinancialDataLoading ? '...' : formatCurrency(location.metrics?.moneyIn || 0)}
          </span>
        </div>
      </div>

      <button
        onClick={() => (window.location.href = `/locations/${location.id}`)}
        className="mt-3 w-full rounded bg-blue-600 py-1.5 text-center text-[10px] font-semibold text-white transition-colors hover:bg-blue-700"
      >
        View Full Analytics
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReportsLocationsMapImplementation({
  locations,
  center = [10.6918, -61.2225], // Default to Trinidad
  zoom = 10,
  compact = false,
  financialDataLoading = false,
  loading: _loading = false,
}: MapImplementationProps) {
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Initialize Leaflet icons
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon.png',
      iconUrl: '/leaflet/marker-icon-image.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
    // Force iconUrl to be set
    L.Marker.prototype.options.icon = new L.Icon.Default();
  }, []);

  // Filter valid locations with coordinates
  const validLocations = locations.filter(location => {
    if (!location.coordinates) return false;
    if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) return false;
    const [lat, lon] = location.coordinates;
    return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
  });

  const locationsWithoutCoords = locations.filter(location => {
    if (!location.coordinates) return true;
    if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) return true;
    const [lat, lon] = location.coordinates;
    return typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0;
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const filtered = validLocations.filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const zoomToLocation = (location: LocationData) => {
    if (!mapRef.current || !mapInstanceReady) return;
    if (!location.coordinates) {
      setSearchQuery(location.name);
      setShowSearchResults(false);
      return;
    }
    const [lat, lon] = location.coordinates;
    mapRef.current.setView([lat, lon], 15);
    setSearchQuery(location.name);
    setShowSearchResults(false);
  };

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setMapInstanceReady(true);
  }, []);

  const mapCenter = validLocations.length > 0 && validLocations[0].coordinates ? validLocations[0].coordinates : center;

  const renderMarker = (location: LocationData, key: string) => {
    if (!location.coordinates) return null;
    const [lat, lon] = location.coordinates;
    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <LocationPopupContent
            location={location}
            isFinancialDataLoading={financialDataLoading}
          />
        </Popup>
      </Marker>
    );
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className="relative z-0 h-full w-full">
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapController onMapReady={handleMapReady} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              className="grayscale"
            />
            {mapInstanceReady && validLocations.map(location => renderMarker(location, location.id))}
          </MapContainer>
          <PerformanceLegend />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Performance Map
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Interactive map showing casino location performance metrics
          </p>
        </CardHeader>
        <CardContent>
          {locationsWithoutCoords.length > 0 && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <MapPin className="h-4 w-4" />
                <span>
                  <strong>{locationsWithoutCoords.length}</strong> location{locationsWithoutCoords.length !== 1 ? 's' : ''} has no coordinates
                </span>
              </div>
            </div>
          )}

          <div className="relative z-0 h-[500px] w-full overflow-hidden rounded-lg lg:h-[45rem]">
            <div className="absolute left-3 top-3 z-[1000] w-[calc(100%-1.5rem)] max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white/95 py-2 pl-10 pr-4 text-sm shadow-lg backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={e => e.stopPropagation()}
                />
                {showSearchResults && (
                  <div className="absolute top-full z-[1001] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {searchResults.length > 0 ? (
                      searchResults.map(location => (
                        <button
                          key={location.id}
                          onClick={e => {
                            e.stopPropagation();
                            zoomToLocation(location);
                          }}
                          className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-gray-100"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{location.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No locations found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <MapController onMapReady={handleMapReady} />
              <MapAutoBounds locations={validLocations} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                className="grayscale"
              />
              {mapInstanceReady && validLocations.map(location => renderMarker(location, location.id))}
            </MapContainer>
            <PerformanceLegend />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

